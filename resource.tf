terraform {
 required_providers {
  squaredup = {
   source = "registry.terraform.io/squaredup/squaredup"
  }
 }
}
provider "squaredup" {
 region = "us"
 api_key = "bIMYMcZJ9tlAFslAq0q0"
}

resource "squaredup_workspace" "application_workspace" {
  display_name = "Application Team"
  description  = "Workspace with Dashboards for Application Team"
  //auto link
}

resource "squaredup_workspace" "devops_workspace" {
  display_name            = "DevOps Team"
  description             = "Workspace with Dashboards for DevOps Team"
  type                    = "application"
  tags                    = ["terraform", "auto-created"]
  workspaces_links = ["space-123"] //only link so disable auto link
}

workspaces_links = [] #disable auto link